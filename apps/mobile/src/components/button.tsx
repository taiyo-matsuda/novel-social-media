import { useTheme } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

type Props = {
  label: string;
  onPress: () => void;
  /** primary：塗りつぶし、secondary：枠線だけ */
  variant?: "primary" | "secondary";
  disabled?: boolean;
  loading?: boolean;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
}: Props) {
  const { colors } = useTheme();
  const primary = variant === "primary";
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary
          ? { backgroundColor: colors.primary }
          : { borderColor: colors.border, borderWidth: 1 },
        (pressed || inactive) && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? "#fff" : colors.text} />
      ) : (
        <Text style={[styles.label, { color: primary ? "#fff" : colors.text }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 17, fontWeight: "600" },
});
