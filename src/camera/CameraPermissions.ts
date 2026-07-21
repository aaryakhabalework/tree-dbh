// ─── Camera Permissions ───────────────────────────────────────────────────────
import { useCameraPermission } from 'react-native-vision-camera';

export { useCameraPermission };

/**
 * Returns a simplified permission state object.
 */
export function useCameraAccess(): {
  granted: boolean;
  requesting: boolean;
  request: () => Promise<boolean>;
} {
  const { hasPermission, requestPermission } = useCameraPermission();
  return {
    granted: hasPermission,
    requesting: false,
    request: requestPermission,
  };
}
