const express = require("express");
require('dotenv').config();

const app = express();
app.use(express.json());

app.post("/api/edit-article", async (req, res) => {
  const { filename, content, user } = req.body;
  if (!filename || !content) {
    return res.status(400).json({ success: false, error: "Missing filename or content." });
  }

  // Prepare GitHub API request
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const OWNER = "riki-pedia";
  const REPO = "tests";

  try {
    // 1. Get default branch
    const repoRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "cf-worker" }
    });
    const repoData = await repoRes.json();
    const baseBranch = repoData.default_branch;

    // 2. Get latest commit SHA
    const refRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/ref/heads/${baseBranch}`, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "cf-worker" }
    });
    const refData = await refRes.json();
    const latestCommitSha = refData.object.sha;

    // 3. Create a new branch
    const branchName = `edit-${Date.now()}`;
    await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/refs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "cf-worker", "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: latestCommitSha
      })
    });

    // 4. Get file SHA (if exists)
    let fileSha = undefined;
    const fileRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${filename}?ref=${baseBranch}`, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "cf-worker" }
    });
    if (fileRes.ok) {
      const fileData = await fileRes.json();
      fileSha = fileData.sha;
    }

    // 5. Commit new content
    await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${filename}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "cf-worker", "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Edit by ${user || "anonymous"}`,
        content: btoa(unescape(encodeURIComponent(content))),
        branch: branchName,
        sha: fileSha
      })
    });

    // 6. Create PR
    const prRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/pulls`, {
      method: "POST",
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "User-Agent": "cf-worker", "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Edit to ${filename} by ${user || "anonymous"}`,
        head: branchName,
        base: baseBranch,
        body: `Proposed edit to ${filename} by ${user || "anonymous"}`
      })
    });
    const pr = await prRes.json();

    return res.json({ success: true, pr_url: pr.html_url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => console.log("Edit API running on port 3000"));