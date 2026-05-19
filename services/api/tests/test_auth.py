"""Integration tests for auth endpoints."""

import uuid
import pytest
from sqlalchemy import select

from app.modules.auth.models import User


class TestRegister:
    """Test user registration."""

    async def test_register_success(self, client):
        """Test successful user registration."""
        response = await client.post(
            "/api/auth/register",
            json={"email": "newuser@example.com", "password": "password123"},
        )

        assert response.status_code == 201
        data = response.json()

        assert data["email"] == "newuser@example.com"
        assert "id" in data, "User id must be populated after registration"
        assert data["id"] is not None, "User id cannot be null"

        try:
            uuid.UUID(data["id"])
        except ValueError:
            pytest.fail(f"Invalid UUID format for id: {data['id']}")

        assert "created_at" in data

    async def test_register_duplicate_email(self, client, db_session):
        """Test registration with duplicate email."""
        existing_user = User(
            email="test@example.com",
            password_hash="$2b$12$somehash",
        )
        db_session.add(existing_user)
        await db_session.commit()

        response = await client.post(
            "/api/auth/register",
            json={"email": "test@example.com", "password": "password123"},
        )

        assert response.status_code == 409
        assert "already exists" in response.json()["detail"].lower()

    async def test_register_invalid_email(self, client):
        """Test registration with invalid email."""
        response = await client.post(
            "/api/auth/register",
            json={"email": "notanemail", "password": "password123"},
        )

        assert response.status_code == 422

    async def test_register_password_too_short(self, client):
        """Test registration with password shorter than 8 characters."""
        response = await client.post(
            "/api/auth/register",
            json={"email": "user@example.com", "password": "short"},
        )

        assert response.status_code == 422
        assert "at least 8 characters" in str(response.json()).lower()


class TestLogin:
    """Test user login."""

    @pytest.fixture
    async def registered_user(self, db_session):
        """Create a test user."""
        from app.modules.auth.router import _hash

        user = User(
            email="user@example.com",
            password_hash=_hash("password123"),
        )
        db_session.add(user)
        await db_session.flush()
        await db_session.commit()
        return user

    async def test_login_success(self, client, registered_user):
        """Test successful login."""
        response = await client.post(
            "/api/auth/login",
            json={"email": "user@example.com", "password": "password123"},
        )

        assert response.status_code == 200
        data = response.json()

        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["access_token"] is not None
        assert data["refresh_token"] is not None

    async def test_login_wrong_password(self, client, registered_user):
        """Test login with wrong password."""
        response = await client.post(
            "/api/auth/login",
            json={"email": "user@example.com", "password": "wrongpassword"},
        )

        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()

    async def test_login_nonexistent_user(self, client):
        """Test login with nonexistent email."""
        response = await client.post(
            "/api/auth/login",
            json={"email": "nonexistent@example.com", "password": "password123"},
        )

        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()

    async def test_login_updates_last_login(self, client, registered_user, db_session):
        """Test that login updates last_login timestamp."""
        initial_last_login = registered_user.last_login

        await client.post(
            "/api/auth/login",
            json={"email": "user@example.com", "password": "password123"},
        )

        await db_session.refresh(registered_user)
        updated_user = await db_session.execute(
            select(User).where(User.id == registered_user.id)
        )
        updated_user = updated_user.scalar_one()

        assert updated_user.last_login is not None
        assert initial_last_login != updated_user.last_login


class TestRefresh:
    """Test token refresh."""

    async def test_refresh_valid_token(self, client):
        """Test refresh with valid refresh token."""
        register_response = await client.post(
            "/api/auth/register",
            json={"email": "user@example.com", "password": "password123"},
        )

        login_response = await client.post(
            "/api/auth/login",
            json={"email": "user@example.com", "password": "password123"},
        )

        refresh_token = login_response.json()["refresh_token"]

        response = await client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    async def test_refresh_invalid_token(self, client):
        """Test refresh with invalid token."""
        response = await client.post(
            "/api/auth/refresh",
            json={"refresh_token": "invalid.token.here"},
        )

        assert response.status_code == 401


class TestMe:
    """Test get current user endpoint."""

    async def test_me_with_valid_token(self, client):
        """Test getting current user with valid token."""
        login_response = await client.post(
            "/api/auth/register",
            json={"email": "user@example.com", "password": "password123"},
        )

        login_response = await client.post(
            "/api/auth/login",
            json={"email": "user@example.com", "password": "password123"},
        )

        access_token = login_response.json()["access_token"]

        response = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "user@example.com"
        assert "id" in data

    async def test_me_without_token(self, client):
        """Test getting current user without token."""
        response = await client.get("/api/auth/me")

        assert response.status_code == 403

    async def test_me_with_invalid_token(self, client):
        """Test getting current user with invalid token."""
        response = await client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )

        assert response.status_code == 403
