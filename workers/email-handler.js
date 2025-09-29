/**
 * Cloudflare Worker for Handling Incoming Emails
 *
 * This worker is triggered whenever an email is sent to a configured address.
 * It captures the raw email content and securely forwards it to a backend API endpoint for processing and storage.
 *
 * @see https://developers.cloudflare.com/workers/runtime-apis/email-event/
 */
export default {
    /**
     * @param {EmailMessage} message - The incoming email message object.
     * @param {object} env - The environment object containing secrets and bindings.
     * @param {object} ctx - The execution context.
     */
    async email(message, env, ctx) {
        // --- Configuration ---
        // These secrets must be set in your Cloudflare dashboard under:
        // Your Worker > Settings > Variables
        const apiEndpoint = env.API_ENDPOINT_URL; // e.g., "https://yourdomain.com/api/email_receiver.php"
        const workerSecret = env.WORKER_SECRET;   // A shared secret to authenticate the worker with your backend

        if (!apiEndpoint || !workerSecret) {
            console.error("Worker is not configured. API_ENDPOINT_URL and WORKER_SECRET must be set.");
            // Reject the email to signal a configuration error
            message.setReject("Upstream service misconfigured");
            return;
        }

        // --- Process the Email ---
        // Read the raw email content from the stream into a single string
        const rawEmail = await streamToString(message.raw);

        // --- Forward to Backend ---
        try {
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Use a secret header to verify the request is coming from our worker
                    'X-Worker-Secret': workerSecret,
                },
                body: JSON.stringify({
                    from: message.from,
                    to: message.to,
                    headers: [...message.headers], // Convert headers to a plain array
                    raw_email: rawEmail,
                }),
            });

            if (!response.ok) {
                // If the backend returns an error, log it and reject the email
                const errorText = await response.text();
                console.error(`Backend API request failed with status ${response.status}: ${errorText}`);
                message.setReject(`Upstream backend API failed: ${response.status}`);
            }
            // If successful, the email is implicitly accepted and will not bounce.

        } catch (error) {
            console.error("Error forwarding email to backend API:", error);
            // If we can't even reach the backend, reject the email
            message.setReject("Upstream backend service is unreachable");
        }
    }
};

/**
 * A helper function to read a ReadableStream into a string.
 * @param {ReadableStream} stream
 * @returns {Promise<string>}
 */
async function streamToString(stream) {
    const reader = stream.getReader();
    let chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        chunks.push(value);
    }

    // Combine the chunks (Uint8Array) into a single Uint8Array
    const combinedChunks = new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []));

    // Decode the Uint8Array into a string, assuming UTF-8
    return new TextDecoder("utf-8").decode(combinedChunks);
}