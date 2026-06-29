import { Box, Flex, Text } from "@chakra-ui/react";

export function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <Flex align="center" gap={2.5}>
      <Box
        w={size === "lg" ? "9px" : "8px"}
        h={size === "lg" ? "9px" : "8px"}
        rounded="full"
        bg="#059669"
      />
      <Text
        fontFamily="heading"
        fontWeight="600"
        fontSize={size === "lg" ? "2xl" : "lg"}
        letterSpacing="-0.02em"
        color="#1A1A1E"
        lineHeight="1"
      >
        Connecta
        <Box as="span" color="#A1A1AA" fontWeight="500">
          {" "}
          ISP
        </Box>
      </Text>
    </Flex>
  );
}
