import { useState, useEffect, useCallback } from "react";
import * as LocalAuthentication from "expo-local-authentication";

type BiometricType = "fingerprint" | "facial-recognition" | "iris" | "none";

interface UseBiometricAuthReturn {
  isAvailable: boolean;
  biometricType: BiometricType;
  isLoading: boolean;
  authenticate: (options?: {
    promptMessage?: string;
    fallbackLabel?: string;
    cancelLabel?: string;
  }) => Promise<boolean>;
}

function mapAuthenticationType(
  types: LocalAuthentication.AuthenticationType[]
): BiometricType {
  if (
    types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
  ) {
    return "facial-recognition";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return "fingerprint";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return "iris";
  }
  return "none";
}

export function useBiometricAuth(): UseBiometricAuthReturn {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>("none");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  async function checkBiometricAvailability() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();

      setIsAvailable(compatible && enrolled);

      if (compatible && enrolled) {
        const types =
          await LocalAuthentication.supportedAuthenticationTypesAsync();
        setBiometricType(mapAuthenticationType(types));
      }
    } catch {
      setIsAvailable(false);
      setBiometricType("none");
    } finally {
      setIsLoading(false);
    }
  }

  const authenticate = useCallback(
    async (options?: {
      promptMessage?: string;
      fallbackLabel?: string;
      cancelLabel?: string;
    }): Promise<boolean> => {
      if (!isAvailable) return false;

      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: options?.promptMessage ?? "Authenticate to continue",
          fallbackLabel: options?.fallbackLabel ?? "Use PIN",
          cancelLabel: options?.cancelLabel ?? "Cancel",
          disableDeviceFallback: false,
        });

        return result.success;
      } catch {
        return false;
      }
    },
    [isAvailable]
  );

  return {
    isAvailable,
    biometricType,
    isLoading,
    authenticate,
  };
}
