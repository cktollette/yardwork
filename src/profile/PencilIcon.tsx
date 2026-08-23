import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

/**
 * A small muted pencil (edit) icon, sized to the line height, used as the edit
 * affordance trailing the Profile location line. Decorative — hidden from
 * assistive tech (the surrounding pressable carries the "Edit location" label).
 */
export default function PencilIcon({
  size = 16,
  color = colors.textMuted,
  testID = 'location-edit-icon',
}: {
  size?: number;
  color?: string;
  testID?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
        fill={color}
      />
    </Svg>
  );
}
