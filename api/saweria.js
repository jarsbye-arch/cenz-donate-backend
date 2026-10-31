const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const OWNER = "jarsbye-arch";
const REPO = "cenz-donate-backend";
const FILE_PATH = "donators.json";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { donator_name, amount_raw, amount, message } = req.body || {};
    const username = donator_name || "Anonymous";
    const donationAmount = Number(amount_raw ?? amount) || 0;

    for (let attempt = 1; attempt <= 3; attempt++) {
      let sha = null;
      let data = { total_donations: 0, top_donators: {}, recent_donations: [] };

      try {
        const { data: fileData } = await octokit.repos.getContent({
          owner: OWNER,
          repo: REPO,
          path: FILE_PATH,
        });
        sha = fileData.sha;
        data = JSON.parse(Buffer.from(fileData.content, "base64").toString("utf-8"));
      } catch (err) {
        console.log("File belum ada atau baru dibuat...");
      }

      data.total_donations = (data.total_donations || 0) + donationAmount;
      data.top_donators = data.top_donators || {};
      data.top_donators[username] = (data.top_donators[username] || 0) + donationAmount;

      data.recent_donations = data.recent_donations || [];
      data.recent_donations.unshift({
        username,
        amount: donationAmount,
        message: message || "",
        timestamp: new Date().toISOString(),
      });
      if (data.recent_donations.length > 20) data.recent_donations.pop();

      try {
        await octokit.repos.createOrUpdateFileContents({
          owner: OWNER,
          repo: REPO,
          path: FILE_PATH,
          message: `[Auto-Donate] Update dari ${username} (${donationAmount})`,
          content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
          sha: sha || undefined,
        });
        return res.status(200).json({ success: true, message: "Berhasil dicatat ke GitHub!" });
      } catch (err) {
        if (err.status === 409 && attempt < 3) continue;
        throw err;
      }
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
