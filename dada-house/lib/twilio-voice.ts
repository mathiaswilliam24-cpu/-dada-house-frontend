import twilio from "twilio";

/** Twilio Client identity used for the browser softphone, per agent user id. */
export function agentIdentity(userId: string): string {
  return `agent-${userId}`;
}

/**
 * Issues a short-lived Twilio Access Token (VoiceGrant) for the browser
 * softphone. Requires an API Key/Secret (distinct from the Account SID/Auth
 * Token) plus a TwiML Application SID whose Voice URL points at
 * /api/twilio/voice/outgoing.
 */
export function createVoiceAccessToken(userId: string): string {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

  if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
    throw new Error(
      "Twilio Voice is not configured — set TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, TWILIO_TWIML_APP_SID"
    );
  }

  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
    identity: agentIdentity(userId),
    ttl: 3600,
  });

  token.addGrant(
    new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    })
  );

  return token.toJwt();
}
