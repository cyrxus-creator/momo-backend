const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json());
app.use(cors());

const CONFIG = {
  SUBSCRIPTION_KEY: "48927b94feb043819043a4c15a6df927",
  API_USER: "f4b3c2d1-e5a6-4890-bcde-f1234567890a",
  API_KEY: "c2a02a460d3845eaadbe531976f27b2b",
  BASE_URL: "https://sandbox.momodeveloper.mtn.com",
  ENVIRONMENT: "sandbox",
  CURRENCY: "EUR",
};

async function getAccessToken() {
  const credentials = Buffer.from(`${CONFIG.API_USER}:${CONFIG.API_KEY}`).toString("base64");
  const response = await axios.post(`${CONFIG.BASE_URL}/collection/token/`, {}, {
    headers: {
      Authorization: `Basic ${credentials}`,
      "Ocp-Apim-Subscription-Key": CONFIG.SUBSCRIPTION_KEY,
    },
  });
  return response.data.access_token;
}

app.post("/payer", async (req, res) => {
  const { montant, numero, reference, description } = req.body;
  if (!montant || !numero) {
    return res.status(400).json({ success: false, message: "Montant et numéro requis" });
  }
  try {
    const token = await getAccessToken();
    const paymentId = uuidv4();
    await axios.post(`${CONFIG.BASE_URL}/collection/v1_0/requesttopay`, {
      amount: String(montant),
      currency: CONFIG.CURRENCY,
      externalId: reference || paymentId,
      payer: { partyIdType: "MSISDN", partyId: numero },
      payerMessage: description || "Paiement commande",
      payeeNote: "Boutique Mario - Merci",
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Reference-Id": paymentId,
        "X-Target-Environment": CONFIG.ENVIRONMENT,
        "Ocp-Apim-Subscription-Key": CONFIG.SUBSCRIPTION_KEY,
        "Content-Type": "application/json",
      },
    });
    res.json({ success: true, paymentId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur paiement", details: error.response?.data });
  }
});

app.get("/statut/:paymentId", async (req, res) => {
  try {
    const token = await getAccessToken();
    const response = await axios.get(`${CONFIG.BASE_URL}/collection/v1_0/requesttopay/${req.params.paymentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Target-Environment": CONFIG.ENVIRONMENT,
        "Ocp-Apim-Subscription-Key": CONFIG.SUBSCRIPTION_KEY,
      },
    });
    res.json({ success: true, statut: response.data.status, paye: response.data.status === "SUCCESSFUL" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur statut" });
  }
});

app.get("/", (req, res) => {
  res.json({ message: "✅ Backend MTN MoMo opérationnel" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Serveur démarré sur le port ${PORT}`));
