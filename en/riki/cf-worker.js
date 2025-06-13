// index.js (Cloudflare Worker)
function withCORS(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return response;
}
const UPSTREAM_OWNER = "riki-pedia";
const FORK_OWNER = "rikipedia-bot";
const REPO = "tests";

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS"
        }
      });
    }

    if (request.method !== "POST") {
      return withCORS(new Response("Method Not Allowed", { status: 405 }));
    }
    const { filename, content, user, explanation } = await request.json();
    if (!filename || !content) {
      return withCORS(Response.json({ success: false, error: "Missing filename or content." }, { status: 400 }));
    }

    try {

      // 2. Get default branch of upstream
      const repoRes = await fetch(`https://api.github.com/repos/${UPSTREAM_OWNER}/${REPO}`, {
        headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "User-Agent": "cf-worker" }
      });
      const repoData = await repoRes.json();
      const baseBranch = repoData.default_branch;

      // 1. Get upstream default branch SHA
      const upstreamRefRes = await fetch(
        `https://api.github.com/repos/${UPSTREAM_OWNER}/${REPO}/git/ref/heads/${baseBranch}`,
        { headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "User-Agent": "cf-worker" } }
      );
      if (!upstreamRefRes.ok) {
        const err = await upstreamRefRes.text();
        throw new Error("Failed to get upstream ref: " + err);
      }
      const upstreamRefData = await upstreamRefRes.json();
      const upstreamSha = upstreamRefData.object.sha;

      // 2. Update fork's default branch to match upstream (force update)
      const updateForkRes = await fetch(
        `https://api.github.com/repos/${FORK_OWNER}/${REPO}/git/refs/heads/${baseBranch}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            "User-Agent": "cf-worker",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            sha: upstreamSha,
            force: true
          })
        }
      );
      if (!updateForkRes.ok) {
        const err = await updateForkRes.text();
        throw new Error("Failed to sync fork with upstream: " + err);
      }

      // 3. Get latest commit SHA from fork's default branch
      const refRes = await fetch(`https://api.github.com/repos/${FORK_OWNER}/${REPO}/git/ref/heads/${baseBranch}`, {
        headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "User-Agent": "cf-worker" }
      });
      const refData = await refRes.json();
      const latestCommitSha = refData.object.sha;

      // 4. Create a new branch on the fork
      const branchName = `edit-${Date.now()}-${Math.floor(Math.random()*10000)}-${explanation}`;
      const branchRes = await fetch(`https://api.github.com/repos/${FORK_OWNER}/${REPO}/git/refs`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "User-Agent": "cf-worker", "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: latestCommitSha
        })
      });
      if (!branchRes.ok) {
        const err = await branchRes.text();
        throw new Error("GitHub branch create failed: " + err);
      }

      // 5. Get file SHA (if exists) from fork and the current file content
      let fileSha = undefined;
      const fileRes = await fetch(`https://api.github.com/repos/${FORK_OWNER}/${REPO}/contents/${filename}?ref=${baseBranch}`, {
        headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "User-Agent": "cf-worker" }
      });
      if (!fileRes.ok) {
        const err = await fileRes.text();
        return withCORS(Response.json({
          success: false,
          error: `Failed to fetch file: ${err}`
        }, { status: 400 }));
      }
      const fileData = await fileRes.json();
      fileSha = fileData.sha;
      // Decode base64 content
      const oldHtml = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ""))));
      // Debug: log the start of the file
      // console.log("Fetched file content:", oldHtml.slice(0, 200));
      const updatedHtml = updateTextDivPreservingImages(oldHtml, content);
      if (!updatedHtml) {
       return withCORS(Response.json({
    success: false,
    error: "Could not find <div class=\"text\"> in the file. No changes made."
  }, { status: 400 }));
}
      // 6. Commit new content to the fork/branch
      const commitRes = await fetch(`https://api.github.com/repos/${FORK_OWNER}/${REPO}/contents/${filename}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "User-Agent": "cf-worker", "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Edit by ${user || "anonymous"}`,
          content: btoa(unescape(encodeURIComponent(updatedHtml))),
          branch: branchName,
          sha: fileSha
        })
      });
      if (!commitRes.ok) {
        const err = await commitRes.text();
        throw new Error("GitHub commit failed: " + err);
      }

      // 7. Create PR from fork/branch to upstream
      const prRes = await fetch(`https://api.github.com/repos/${UPSTREAM_OWNER}/${REPO}/pulls`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "User-Agent": "cf-worker", "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Edit to ${filename} by ${user || "anonymous"}`,
          head: `${FORK_OWNER}:${branchName}`,
          base: baseBranch,
          body: `Proposed edit to ${filename} by ${user || "anonymous"} - ${explanation}`
        })
      });
      if (!prRes.ok) {
        const err = await prRes.text();
        throw new Error("GitHub PR create failed: " + err);
      }
      const pr = await prRes.json();

      // Get user IP from request headers
      const userIp = request.headers.get("cf-connecting-ip") || "unknown";

      // Send notification to Formspree
      await fetch("https://formspree.io/f/mdkzgpey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _replyto: user.includes('@') ? user : undefined,
          name: user,
          message: `New PR submitted: ${pr.html_url}\nFrom IP: ${userIp}`,
          ip: userIp,
          pr_url: pr.html_url,
          filename,
          user
        })
      });

      // Respond to frontend
      return withCORS(Response.json({ success: true, pr_url: pr.html_url }));
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }
}
function wrapJsonAsHtml(blocks) {
  if (!Array.isArray(blocks)) return '<div class="text"></div>';
  return `<div class="text">\n${blocks.map(block => {
    const safeType = String(block.type).toLowerCase();
    const safeText = escapeHtml(block.text || '');
    // Only allow certain tags
    if (/^h[1-6]$/.test(safeType)) return `<${safeType}>${safeText}</${safeType}>`;
    if (safeType === 'p') return `<p>${safeText}</p>`;
    return '';
  }).join('\n')}\n</div>`;
}

// Helper to escape HTML special chars
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function updateTextDivPreservingImages(oldHtml, blocks) {
  // Match the .text div
  const textDivRegex = /<div\s+[^>]*class\s*=\s*["'][^"']*\btext\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i;
  const match = oldHtml.match(textDivRegex);
  if (!match) return null;

  // Parse the inner HTML of .text
  const innerHtml = match[1];
  // Use DOMParser if available, otherwise fallback to string manipulation
  // For Cloudflare Workers, use HTMLRewriter or a simple workaround:
  // We'll split by block-level tags and replace only h1-h6 and p

  // 1. Extract all non-h/p elements (e.g., images)
  const preserved = [];
  let lastIndex = 0;
  const tagRegex = /<(img|br)[^>]*>/gi;
  let m;
  while ((m = tagRegex.exec(innerHtml)) !== null) {
    preserved.push({ index: m.index, html: m[0] });
  }

  // 2. Build new content from blocks
  const newBlocksHtml = blocks.map(block => {
    const safeType = String(block.type).toLowerCase();
    const safeText = escapeHtml(block.text || '');
    if (/^h[1-6]$/.test(safeType)) return `<${safeType}>${safeText}</${safeType}>`;
    if (safeType === 'p') return `<p>${safeText}</p>`;
    return '';
  }).join('\n');

  // 3. Re-insert preserved elements at their original positions (approximate)
  // For a more robust solution, use a real HTML parser
  let rebuilt = newBlocksHtml;
  preserved.forEach(item => {
    rebuilt += '\n' + item.html;
  });

  // 4. Replace the .text div in the original HTML
  return oldHtml.replace(textDivRegex, match[0].replace(match[1], rebuilt));
}