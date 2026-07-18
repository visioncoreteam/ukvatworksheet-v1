/**
 * Backend version of managerApi - makes direct HTTP calls to Manager.io
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} path - API path (e.g., '/api3/business-details-form')
 * @param {object} body - Request body for POST/PUT requests
 * @returns {Promise<object>} Response with body property
 */
async function managerApi(method, path, body) {
    const baseUrl = process.env.MANAGER_API_URL || 'http://localhost:8080';
    const fullUrl = `${baseUrl}${path}`;

    try {
        const config = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (body && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(body);
        }

        const response = await fetch(fullUrl, config);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
            body: data,
            status: response.status
        };
    } catch (error) {
        console.error(`Manager API Error [${method} ${path}]:`, error.message);
        throw error;
    }
}

module.exports = { managerApi };
