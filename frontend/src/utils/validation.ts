/**
 * Validation utilities for auth forms
 */

import { AxiosError } from 'axios'

export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email) {
    return { valid: false, error: 'Email is required' }
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' }
  }
  return { valid: true }
}

export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password) {
    return { valid: false, error: 'Password is required' }
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' }
  }
  return { valid: true }
}

export const validatePasswordMatch = (
  password: string,
  confirmPassword: string,
): { valid: boolean; error?: string } => {
  if (!confirmPassword) {
    return { valid: false, error: 'Please confirm your password' }
  }
  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' }
  }
  return { valid: true }
}

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout - the API server is slow or not responding'
    }
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return 'Cannot reach the API server. Please ensure it is running on http://localhost:8000'
    }
    if (!error.response) {
      return 'Network connection failed. Check your internet connection.'
    }

    if (error.response.status === 409) {
      return 'Email already exists. Please log in or use a different email.'
    }
    if (error.response.status === 401) {
      return 'Invalid email or password'
    }
    if (error.response.status >= 500) {
      return 'Server error. Please try again later.'
    }

    if (error.response.data && typeof error.response.data === 'object') {
      const data = error.response.data as Record<string, unknown>
      if (data.detail && typeof data.detail === 'string') {
        return data.detail
      }
    }

    return error.message || 'Network error. Please try again.'
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>
    if (errObj.response && typeof errObj.response === 'object') {
      const response = errObj.response as Record<string, unknown>
      if (response.status === 409) {
        return 'Email already exists. Please log in or use a different email.'
      }
      if (response.data && typeof response.data === 'object') {
        const data = response.data as Record<string, unknown>
        if (data.detail && typeof data.detail === 'string') {
          return data.detail
        }
      }
    }
  }

  return 'An error occurred. Please try again.'
}
