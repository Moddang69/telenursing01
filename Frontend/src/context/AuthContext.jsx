import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import { authService } from '../services/authService.js';
import { connectSocket, disconnectSocket } from '../config/socketClient.js';
import { unsubscribeThisDevice } from '../services/pushService.js';

const AuthContext = createContext(null);

const SESSION_TIMEOUT_MS =
  30 * 60 * 1000;

export function AuthProvider({ children }) {

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [sessionExpired, setSessionExpired] =
    useState(false);

  const timeoutRef =
    useRef(null);


  // =========================================================
  // RESTORE SESSION
  // =========================================================
  useEffect(() => {

    let mounted = true;

    const restore = async () => {

      const restored =
        await authService.restoreSession();

      if (mounted) {
        setUser(restored);
        if (restored) {
          connectSocket();
        }
      }

      if (mounted) {
        setLoading(false);
      }
    };

    restore();

    return () => {
      mounted = false;
    };

  }, []);


  // =========================================================
  // SESSION TIMEOUT
  // =========================================================
  const resetSessionTimer =
    useCallback(() => {

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current =
        setTimeout(async () => {

          setSessionExpired(true);
          setUser(null);

          await unsubscribeThisDevice();
          await authService.logout();
          disconnectSocket();

        }, SESSION_TIMEOUT_MS);

    }, []);


  // =========================================================
  // USER ACTIVITY
  // =========================================================
  useEffect(() => {

    if (!user) {
      return undefined;
    }

    resetSessionTimer();

    const events = [
      'click',
      'keydown',
      'mousemove',
    ];

    const handler = () => {
      resetSessionTimer();
    };

    events.forEach((event) => {
      window.addEventListener(
        event,
        handler
      );
    });

    return () => {

      events.forEach((event) => {
        window.removeEventListener(
          event,
          handler
        );
      });

      if (timeoutRef.current) {
        clearTimeout(
          timeoutRef.current
        );
      }
    };

  }, [user, resetSessionTimer]);


  // =========================================================
  // BACKEND SESSION EXPIRED EVENT
  // =========================================================
  useEffect(() => {

    const handleSessionExpired = () => {

      setUser(null);
      setSessionExpired(true);
      disconnectSocket();
      unsubscribeThisDevice(); // Token หมดอายุแล้ว: เลิกรับ Push ฝั่งอุปกรณ์ (ไม่รอผล)

    };

    window.addEventListener(
      'session-expired',
      handleSessionExpired
    );

    return () => {

      window.removeEventListener(
        'session-expired',
        handleSessionExpired
      );

    };

  }, []);


  // =========================================================
  // LOGIN
  // =========================================================
  const login =
    useCallback(
      async (credentials) => {

        const loggedInUser =
          await authService.login(
            credentials
          );

        setUser(loggedInUser);
        setSessionExpired(false);
        connectSocket();

        return loggedInUser;

      },
      []
    );


  // =========================================================
  // LOGOUT
  // =========================================================
  const logout =
    useCallback(
      async () => {

        if (timeoutRef.current) {
          clearTimeout(
            timeoutRef.current
          );
        }

        timeoutRef.current = null;

        // เลิกรับ Push ของบัญชีนี้บนเครื่องนี้ก่อนล้าง Token (กันเครื่องที่ใช้ร่วมกันได้แจ้งเตือนของคนก่อนหน้า)
        await unsubscribeThisDevice();
        await authService.logout();
        disconnectSocket();

        setUser(null);
        setSessionExpired(false);

      },
      []
    );


  // =========================================================
  // UPDATE USER
  // ใช้สำหรับ UI state ที่ต้องเปลี่ยนภายหลัง
  // =========================================================
  const updateUser =
    useCallback(
      (partial) => {

        setUser((prev) => {

          if (!prev) {
            return prev;
          }

          const next = {
            ...prev,
            ...partial,
          };

          localStorage.setItem(
            'telenursing_session',
            JSON.stringify(next)
          );

          return next;

        });

      },
      []
    );


  const clearSessionExpired =
    useCallback(() => {
      setSessionExpired(false);
    }, []);


  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        sessionExpired,

        login,
        logout,
        updateUser,
        clearSessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {

  const ctx =
    useContext(AuthContext);

  if (!ctx) {

    throw new Error(
      'useAuth must be used within AuthProvider'
    );

  }

  return ctx;
}