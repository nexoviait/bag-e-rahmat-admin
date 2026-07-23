// Builds a user-friendly message from an axios error, so screens never surface raw
// technical text like "Request failed with status code 500" or "Network Error".
export const friendlyErrorMessage = (error, statusOverrides = {}) => {
    if (!error?.response) {
        return 'Unable to reach the server. Please check your internet connection and try again.';
    }

    const { status, data } = error.response;

    if (statusOverrides[status]) {
        return statusOverrides[status];
    }

    const validationError = data?.errors && Object.values(data.errors)[0]?.[0];
    if (validationError) {
        return validationError;
    }

    // Only trust the backend's message for 4xx — those are deliberate, curated responses
    // (validation, authorization, "not found", etc). A 5xx `message` is Laravel's raw exception
    // text when APP_DEBUG is on (SQL errors, stack info) and must never reach the user directly.
    if (data?.message && status < 500) {
        return data.message;
    }

    switch (status) {
        case 401:
            return 'Your session has expired. Please log in again.';
        case 403:
            return "You don't have permission to do that.";
        case 404:
            return 'The requested item could not be found.';
        case 422:
            return 'Please check the information you entered and try again.';
        case 429:
            return 'Too many requests. Please wait a moment and try again.';
        case 500:
        case 502:
        case 503:
            return 'Something went wrong on our end. Please try again shortly.';
        default:
            return 'Something went wrong. Please try again.';
    }
};
