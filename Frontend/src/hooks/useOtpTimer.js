import { useState, useEffect, useCallback, useRef } from 'react';

const OTP_LIFETIME_SECONDS = 180; // 3 minutes
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_RESEND_COUNT = 5; // CONFIGURABLE: mock limit
const MAX_WRONG_ATTEMPTS = 5; // CONFIGURABLE: mock limit

export function useOtpTimer() {
  const [secondsLeft, setSecondsLeft] = useState(OTP_LIFETIME_SECONDS);
  const [cooldown, setCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const intervalRef = useRef(null);
  const cooldownRef = useRef(null);

  const startExpiryTimer = useCallback(() => {
    setSecondsLeft(OTP_LIFETIME_SECONDS);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const registerSend = useCallback(() => {
    setResendCount((c) => c + 1);
    setWrongAttempts(0);
    startExpiryTimer();
    startCooldown();
  }, [startExpiryTimer, startCooldown]);

  const registerWrongAttempt = useCallback(() => {
    setWrongAttempts((a) => a + 1);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  return {
    secondsLeft,
    isExpired: secondsLeft <= 0,
    cooldown,
    canResend: cooldown <= 0 && resendCount < MAX_RESEND_COUNT,
    resendCount,
    resendLimitReached: resendCount >= MAX_RESEND_COUNT,
    wrongAttempts,
    attemptsLimitReached: wrongAttempts >= MAX_WRONG_ATTEMPTS,
    registerSend,
    registerWrongAttempt,
  };
}