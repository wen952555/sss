/**
 * Cloudflare Worker for Handling Incoming Emails (with enhanced debugging)
 *
 * This worker is triggered whenever an email is sent to a configured address.
 * It now includes robust error handling to catch any failure during execution.
 * If an error occurs, it rejects the email with a detailed error message, which
 * will be sent back to the original sender in a bounce notification.
 */
export default {
    /**
     * @param {EmailMessage} message - The incoming email message object.
     * @param {object} env - The environment object containing secrets and bindings.
     * @param {object} ctx - The execution context.
     */
    async email(message, env, ctx) {
        try {
            // --- Configuration ---
            const apiEndpoint = env.API_ENDPOINT_URL;
            const workerSecret = env.WORKER_SECRET;

            if (!apiEndpoint || !workerSecret) {
                // This is a critical configuration error.
                throw new Error("Worker is not configured. API_ENDPOINT_URL and WORKER_SECRET must be set.");
            }

            // --- Process the Email ---
            const rawEmail = await streamToString(message.raw);

            // --- Forward to Backend ---
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Worker-Secret': workerSecret,
                },
                body: JSON.stringify({
                    from: message.from,
                    to: message.to,
                    headers: [...message.headers],
                    raw_email: rawEmail,
                }),
            });

            if (!response.ok) {
                // The backend returned an error. We include the backend's response in our error.
                const errorText = await response.text();
                throw new Error(`Backend API request failed with status ${response.status}: ${errorText}`);
            }

            // If everything is successful, the email is implicitly accepted.

        } catch (error) {
            // If ANY error occurs in the try block, catch it and reject the email
            // with a detailed error message for debugging.
            console.error("Error processing email:", error.stack);
            message.setReject(`The email could not be processed due to an error in the worker: ${error.stack}`);
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
    const combinedChunks = new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []));
    return new TextDecoder("utf-8").decode(combinedChunks);
}