export default {
  async fetch(request, env) {
    // Cambia questo dominio se in futuro sposti l'app altrove
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://paolo7726.github.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Metodo non consentito", { status: 405, headers: corsHeaders });
    }

    try {
      const { image, mimeType } = await request.json();

      if (!image) {
        return new Response(JSON.stringify({ error: "Nessuna immagine ricevuta" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const prompt = `Sei un assistente per un negozio di intimo e merceria che vende su Vinted. Guarda questa foto di un capo di intimo e restituisci SOLO un oggetto JSON valido (nessun testo extra, nessun markdown, nessun blocco di codice) con questi campi esatti:
{
  "tipo": "scegli SOLO tra queste opzioni esatte: Reggiseno, Slip / Culotte, Set reggiseno + slip, Body, Guêpière / Bustino, Pigiama, Vestaglia / Accappatoio, Camicia da notte, Costume da bagno, Calze / Collant, Altro capo intimo",
  "colore": "colore principale in italiano, una sola parola quando possibile",
  "materiale": "materiale o tessuto visibile, es. pizzo, cotone, microfibra, satin, raso",
  "dettagli": "una frase breve (max 25 parole) con dettagli utili alla vendita: stile, chiusura, fantasia, imbottitura, ferretto, trasparenze ecc.",
  "taglia_visibile": "taglia SOLO se leggibile chiaramente su un'etichetta nella foto, altrimenti stringa vuota"
}
Se un'informazione non è determinabile dalla foto, lascia il campo come stringa vuota. Non inventare dettagli che non vedi.`;

      const geminiResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mimeType || "image/jpeg", data: image } },
                ],
              },
            ],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      if (!geminiResp.ok) {
        const errText = await geminiResp.text();
        return new Response(JSON.stringify({ error: "Errore Gemini: " + errText }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await geminiResp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      return new Response(text, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
