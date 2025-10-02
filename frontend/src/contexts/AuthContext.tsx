'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, getUserProfile, AuthUser } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

interface AuthContextType {
  user: AuthUser | null
  supabaseUser: SupabaseUser | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (currentUser) {
        setSupabaseUser(currentUser)
        
        // Get user profile from our database
        const userProfile = await getUserProfile(currentUser.id)
        if (userProfile) {
          setUser({
            id: userProfile.id,
            email: userProfile.email,
            full_name: userProfile.full_name,
            role: userProfile.role,
            org_id: userProfile.org_id,
            org: userProfile.orgs,
            created_at: userProfile.created_at
          })
        } else {
          // If no profile exists, create basic user info from Supabase user
          setUser({
            id: currentUser.id,
            email: currentUser.email || '',
            full_name: currentUser.user_metadata?.full_name || '',
            role: 'user',
            org_id: null,
            created_at: currentUser.created_at || new Date().toISOString()
          })
        }
      } else {
        setSupabaseUser(null)
        setUser(null)
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
      setSupabaseUser(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Get initial session
    refreshUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await refreshUser()
        } else if (event === 'SIGNED_OUT') {
          setSupabaseUser(null)
          setUser(null)
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      })

      if (error) throw error

      // Create user record in users table after successful signup
      if (data.user && data.user.email_confirmed_at) {
        try {
          await fetch('/api/users/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: data.user.id,
              email: data.user.email,
              full_name: fullName
            })
          })
        } catch (userCreateError) {
          console.error('Failed to create user record:', userCreateError)
        }
      }

      if (data.user && !data.user.email_confirmed_at) {
        toast.success('Please check your email to confirm your account')
      } else {
        // Create user record with organization
        try {
          await fetch('/api/users/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: data.user.id,
              email: data.user.email,
              full_name: fullName
            })
          });
        } catch (userCreateError) {
          console.error('Failed to create user record:', userCreateError);
        }
        
        toast.success('Account created successfully!')
        await refreshUser()
      }
    } catch (error: any) {
      console.error('Sign up error:', error)
      toast.error(error.message || 'Failed to create account')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      toast.success('Signed in successfully!')

      // Sync session cookies for server-side requests
      if (data.session) {
        try {
          console.log('DEBUG: Syncing server session');
          const res = await fetch('/api/auth/cookie', {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            }),
          })
          console.log('DEBUG: /api/auth/cookie response', res?.status);
        } catch (err) {
          console.error('Failed to sync server session:', err)
        }
      }

      await refreshUser()
    } catch (error: any) {
      console.error('Sign in error:', error)
      toast.error(error.message || 'Failed to sign in')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setSupabaseUser(null)
      setUser(null)
      toast.success('Signed out successfully!')
    } catch (error: any) {
      console.error('Sign out error:', error)
      toast.error(error.message || 'Failed to sign out')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    supabaseUser,
    loading,
    signUp,
    signIn,
    signOut,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function signOut() {
  throw new Error('Function not implemented.')
}
