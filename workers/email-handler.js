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
        const { API_ENDPOINT_URL, WORKER_SECRET } = env;

        // If the worker's core configuration is missing, we cannot proceed.
        if (!API_ENDPOINT_URL || !WORKER_SECRET) {
            console.error("Worker is not configured. API_ENDPOINT_URL and WORKER_SECRET must be set.");
            message.setReject("Upstream service critically misconfigured. Cannot forward email.");
            return;
        }

        let rawEmail = '';
        let errorMessage = null;

        try {
            // Attempt to process the email. Any failure in this block will be caught.
            rawEmail = await streamToString(message.raw);

            // Placeholder for any future processing logic that might fail.
            // For example:
            // if (someCondition) {
            //   throw new Error("A custom processing error occurred.");
            // }

        } catch (e) {
            // If an error occurs, we capture it to be logged in the database.
            errorMessage = `Error during worker processing: ${e.message}`;

            // If we failed to read the stream, the body will be empty.
            // We still want to log that the email arrived.
            if (!rawEmail) {
                rawEmail = "[Worker failed to read email stream]";
            }
        }

        // Always attempt to forward the email and any captured error to the backend.
        try {
            const response = await fetch(API_ENDPOINT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Worker-Secret': WORKER_SECRET,
                },
                body: JSON.stringify({
                    from: message.from,
                    to: message.to,
                    headers: [...message.headers],
                    raw_email: rawEmail,
                    error_message: errorMessage, // Pass the error message to the backend.
                }),
            });

            if (!response.ok) {
                // The backend responded with an error. We must reject the email
                // so the sender is notified of a persistent failure.
                const errorText = await response.text();
                message.setReject(`Backend API rejected the email with status ${response.status}: ${errorText}`);
            }
            // On a successful backend response (2xx), the email is accepted.

        } catch (networkError) {
            // This is a fatal network error where we can't reach the backend at all.
            message.setReject(`Fatal: Upstream backend service is unreachable. ${networkError.message}`);
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