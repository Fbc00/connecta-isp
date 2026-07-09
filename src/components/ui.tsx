import {
  Box,
  Button,
  Link as ChakraLink,
  chakra,
  Field,
  Input,
  Text,
  Textarea,
} from "@chakra-ui/react";
import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";

/** Botão sem estilo base, aceitando props HTML de button (type, etc.) + props Chakra. */
export const Pressable = chakra("button", {
  base: { textAlign: "left", cursor: "pointer" },
});

/** Link de navegação (react-router) com aparência de texto Chakra. */
export function TextLink({
  to,
  children,
  ...rest
}: { to: string; children: ReactNode } & Record<string, unknown>) {
  return (
    <ChakraLink asChild color="#059669" fontWeight="500" {...rest}>
      <RouterLink to={to}>{children}</RouterLink>
    </ChakraLink>
  );
}

export const fieldInputProps = {
  h: "42px",
  rounded: "lg",
  bg: "#FFFFFF",
  borderWidth: "1px",
  borderColor: "rgba(0,0,0,0.12)",
  color: "#1A1A1E",
  fontSize: "sm",
  px: 3.5,
  _placeholder: { color: "#A1A1AA" },
  _hover: { borderColor: "rgba(0,0,0,0.2)" },
  _focusVisible: {
    borderColor: "#059669",
    boxShadow: "0 0 0 3px rgba(5,150,105,0.14)",
    outline: "none",
  },
} as const;

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  as?: "input" | "textarea";
  required?: boolean;
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  as = "input",
  required,
}: TextFieldProps) {
  return (
    <Field.Root required={required}>
      <Field.Label fontSize="sm" fontWeight="500" color="#3F3F46">
        {label}
      </Field.Label>
      {as === "textarea" ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          minH="96px"
          {...fieldInputProps}
          h="auto"
          py={2.5}
        />
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          {...fieldInputProps}
        />
      )}
    </Field.Root>
  );
}

export function PrimaryButton(props: Record<string, unknown> & { children: ReactNode }) {
  return (
    <Button
      h="42px"
      rounded="lg"
      fontWeight="600"
      fontSize="sm"
      color="#FFFFFF"
      bg="#1A1A1E"
      transition="background 0.15s ease"
      _hover={{ bg: "#000000" }}
      {...props}
    />
  );
}

export function GhostButton(props: Record<string, unknown> & { children: ReactNode }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      rounded="lg"
      fontWeight="500"
      fontSize="sm"
      color="#52525B"
      _hover={{ bg: "rgba(0,0,0,0.04)", color: "#1A1A1E" }}
      {...props}
    />
  );
}

const TONES: Record<string, { bg: string; fg: string }> = {
  green: { bg: "rgba(5,150,105,0.10)", fg: "#047857" },
  gray: { bg: "rgba(0,0,0,0.05)", fg: "#52525B" },
  red: { bg: "rgba(220,38,38,0.08)", fg: "#B91C1C" },
  amber: { bg: "rgba(217,119,6,0.10)", fg: "#B45309" },
  blue: { bg: "rgba(37,99,235,0.09)", fg: "#1D4ED8" },
};

export function Badge({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
}) {
  const t = TONES[tone] ?? TONES.gray;
  return (
    <Box
      display="inline-flex"
      alignItems="center"
      px={2}
      py={0.5}
      rounded="full"
      fontSize="xs"
      fontWeight="600"
      bg={t.bg}
      color={t.fg}
      whiteSpace="nowrap"
    >
      {children}
    </Box>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <Box
      rounded="lg"
      borderWidth="1px"
      borderColor="rgba(220,38,38,0.2)"
      bg="rgba(220,38,38,0.05)"
      px={3.5}
      py={2.5}
    >
      <Text fontSize="sm" color="#B91C1C">
        {children}
      </Text>
    </Box>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <Box py={14} textAlign="center">
      <Text fontSize="sm" color="#A1A1AA">
        {children}
      </Text>
    </Box>
  );
}
