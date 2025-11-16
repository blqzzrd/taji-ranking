const express = require('express');
const noblox = require('noblox.js');
const app = express();

// --- CONFIGURATION ---
// These MUST be set in your Render Environment Variables
const COOKIE = process.env.ROBLOX_COOKIE;
const GROUP_ID = parseInt(process.env.GROUP_ID, 10);
const API_KEY = process.env.API_KEY; // The key you require in the URL
// ---------------------

/**
 * Main function to log the bot in when the server starts.
 */
async function startApp() {
    if (!COOKIE || !GROUP_ID || !API_KEY) {
        console.error("Missing required environment variables. Check ROBLOX_COOKIE, GROUP_ID, and API_KEY.");
        return;
    }
    
    console.log("Logging in to Roblox...");
    try {
        await noblox.setCookie(COOKIE);
        console.log("Logged in successfully!");
    } catch (err) {
        console.error("Failed to log in:", err.message);
    }
}
startApp();

/**
 * Middleware function to check the API key for all ranking routes.
 */
function checkApiKey(req, res, next) {
    const { key } = req.query; // Using 'key' as the query parameter

    if (!key) {
        return res.status(401).json({ success: false, error: "API key is missing." });
    }
    if (key !== API_KEY) {
        return res.status(403).json({ success: false, error: "Invalid API key." });
    }
    // Key is valid, proceed to the next function (the route handler)
    next();
}

/**
 * Shared function to handle ranking logic.
 */
async function handleRanking(req, res, rankFunction) {
    const { userId, rankId } = req.query;

    // Validate required parameters
    if (!userId || !rankId) {
        return res.status(400).json({ success: false, error: "Missing 'userId' (as username) or 'rankId'." });
    }

    try {
        // 1. Get the numerical ID from the username
        const robloxId = await noblox.getIdFromUsername(userId);

        // 2. Convert rankId to a number (it's a string from the URL)
        const rankIdAsNumber = parseInt(rankId, 10);
        if (isNaN(rankIdAsNumber) || rankIdAsNumber < 0 || rankIdAsNumber > 255) {
            return res.status(400).json({ success: false, error: "Invalid 'rankId'. Must be a number between 0 and 255." });
        }

        // 3. Call the provided ranking function (promote, demote, or setRank)
        const result = await rankFunction(robloxId, rankIdAsNumber);

        // 4. Send success response
        res.json({
            success: true,
            message: `Successfully processed rank for user ${userId} (ID: ${robloxId}).`,
            data: result
        });

    } catch (err) {
        console.error(err); // Log the error on the server
        res.status(500).json({ success: false, error: err.message || "An unknown error occurred." });
    }
}

// --- API ENDPOINTS ---

// Apply the API key check to all routes below this point
app.use('/api/', checkApiKey);

// Promote Endpoint
app.get('/api/ranking/promote', (req, res) => {
    // The rankFunction we pass is noblox.setRank
    handleRanking(req, res, (robloxId, rankId) => {
        console.log(`Promoting user ${robloxId} to rank ${rankId}`);
        // Note: 'promote' just goes up one rank. 'setRank' is more direct.
        // We use setRank to match your "rankId" requirement.
        return noblox.setRank(GROUP_ID, robloxId, rankId);
    });
});

// Demote Endpoint
app.get('/api/ranking/demote', (req, res) => {
    // The rankFunction we pass is also noblox.setRank
    handleRanking(req, res, (robloxId, rankId) => {
        console.log(`Demoting user ${robloxId} to rank ${rankId}`);
        // 'demote' just goes down one. We use setRank to match your requirement.
        return noblox.setRank(GROUP_ID, robloxId, rankId);
    });
});

// Default endpoint to check if the server is running
app.get('/', (req, res) => {
    res.send('Ranking API is running. Use the /api/ranking endpoints to perform actions.');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
