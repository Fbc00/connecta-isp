import { Box, Container, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface PageProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Cabeçalho + container padrão das páginas internas. */
export function Page({ title, subtitle, actions, children }: PageProps) {
  return (
    <Container maxW="6xl" py={{ base: 8, md: 12 }} px={{ base: 5, md: 8 }}>
      <Box
        display="flex"
        alignItems={{ base: "flex-start", sm: "center" }}
        flexDirection={{ base: "column", sm: "row" }}
        gap={3}
        mb={8}
        animation="fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both"
      >
        <Stack gap={1} flex={1}>
          <Text
            fontFamily="heading"
            fontSize={{ base: "2xl", md: "3xl" }}
            fontWeight="600"
            letterSpacing="-0.03em"
            color="#1A1A1E"
          >
            {title}
          </Text>
          {subtitle && (
            <Text fontSize="sm" color="#71717A" maxW="2xl" lineHeight="1.55">
              {subtitle}
            </Text>
          )}
        </Stack>
        {actions}
      </Box>
      {children}
    </Container>
  );
}

/** Card branco padrão. */
export function Card({
  children,
  ...rest
}: { children: ReactNode } & Record<string, unknown>) {
  return (
    <Box
      rounded="xl"
      borderWidth="1px"
      borderColor="rgba(0,0,0,0.08)"
      bg="#FFFFFF"
      {...rest}
    >
      {children}
    </Box>
  );
}
