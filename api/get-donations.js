const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export default async function handler(req, res) {
  try {
    const { data: fileData } = await octokit.repos.getContent({
      owner: "jarsbye-arch",
      repo: "cenz-donate-backend",
      path: "donators.json",
    });
    const json = JSON.parse(Buffer.from(fileData.content, "base64").toString("utf-8"));

    res.setHeader("Cache-Control", "public, s-maxage=5");
    return res.status(200).json(json);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
