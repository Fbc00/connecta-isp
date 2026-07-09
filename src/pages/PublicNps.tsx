import { Box, Flex, Spinner, Stack, Text, Textarea } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Brand } from "../components/Brand";
import { Pressable, PrimaryButton } from "../components/ui";
import { npsPublicApi, type PublicInvite } from "../services/npsApi";

const SCALE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function scoreColor(n: number): string {
  if (n <= 6) return "#DC2626";
  if (n <= 8) return "#D97706";
  return "#059669";
}

export function PublicNps() {
  const { token = "" } = useParams();
  const [invite, setInvite] = useState<PublicInvite | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    npsPublicApi
      .getInvite(token)
      .then((i) => {
        setInvite(i);
        if (i.status === "responded") setDone(true);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Convite inválido"));
  }, [token]);

  async function submit() {
    if (score == null) return;
    setSubmitting(true);
    setError(null);
    try {
      await npsPublicApi.respond(token, score, comment);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Flex minH="100dvh" align="center" justify="center" px={5} py={12} bg="#FBFBFA">
      <Stack
        gap={7}
        w="full"
        maxW="440px"
        animation="fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both"
      >
        <Flex justify="center">
          <Brand size="lg" />
        </Flex>

        <Box
          rounded="xl"
          borderWidth="1px"
          borderColor="rgba(0,0,0,0.08)"
          bg="#FFFFFF"
          p={{ base: 7, sm: 8 }}
          boxShadow="0 1px 2px rgba(0,0,0,0.04), 0 12px 32px -16px rgba(0,0,0,0.12)"
        >
          {loadError ? (
            <Text fontSize="sm" color="#B91C1C" textAlign="center">
              {loadError}
            </Text>
          ) : invite === null ? (
            <Flex justify="center" py={6}>
              <Spinner />
            </Flex>
          ) : done ? (
            <Stack gap={2} textAlign="center" py={4}>
              <Text fontFamily="heading" fontSize="xl" fontWeight="600" color="#1A1A1E">
                Obrigado! 🙌
              </Text>
              <Text fontSize="sm" color="#71717A">
                Sua resposta foi registrada.
              </Text>
            </Stack>
          ) : (
            <Stack gap={5}>
              <Stack gap={1}>
                <Text fontFamily="heading" fontSize="lg" fontWeight="600" color="#1A1A1E">
                  {invite.survey.title}
                </Text>
                <Text fontSize="sm" color="#52525B" lineHeight="1.5">
                  {invite.survey.question}
                </Text>
              </Stack>

              <Flex flexWrap="wrap" gap={1.5} justify="center">
                {SCALE.map((n) => (
                  <Pressable
                    key={n}
                    type="button"
                    w="36px"
                    h="36px"
                    rounded="lg"
                    fontSize="sm"
                    fontWeight="600"
                    textAlign="center"
                    borderWidth="1px"
                    borderColor={score === n ? scoreColor(n) : "rgba(0,0,0,0.12)"}
                    bg={score === n ? scoreColor(n) : "#FFFFFF"}
                    color={score === n ? "#FFFFFF" : "#52525B"}
                    transition="all 0.12s ease"
                    onClick={() => setScore(n)}
                  >
                    {n}
                  </Pressable>
                ))}
              </Flex>

              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Quer deixar um comentário? (opcional)"
                minH="80px"
                rounded="lg"
                borderColor="rgba(0,0,0,0.12)"
                fontSize="sm"
                _focusVisible={{
                  borderColor: "#059669",
                  boxShadow: "0 0 0 3px rgba(5,150,105,0.14)",
                  outline: "none",
                }}
              />

              {error && (
                <Text fontSize="sm" color="#B91C1C">
                  {error}
                </Text>
              )}

              <PrimaryButton
                loading={submitting}
                disabled={score == null}
                onClick={submit}
              >
                Enviar resposta
              </PrimaryButton>
            </Stack>
          )}
        </Box>
      </Stack>
    </Flex>
  );
}
