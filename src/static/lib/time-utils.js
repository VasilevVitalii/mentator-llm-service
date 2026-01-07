/**
 * Formats a Date object to DD.MM.YYYY HH:MM:SS
 * Shows date only if it's different from current date
 * @param {Date} date - The date to format
 * @returns {string} Formatted date/time string
 */
export function formatDateTime(date) {
    if (!date) return ''

    const now = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    const timeStr = `${hours}:${minutes}:${seconds}`

    // Show date only if different from current date
    if (year !== now.getFullYear() ||
        month !== String(now.getMonth() + 1).padStart(2, '0') ||
        day !== String(now.getDate()).padStart(2, '0')) {
        return `${day}.${month}.${year} ${timeStr}`
    }

    return timeStr
}

/**
 * Formats duration in seconds to human readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string (e.g., "2 h 15 min 30 sec")
 */
export function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
        return `${hours} h ${minutes} min ${secs} sec`
    } else if (minutes > 0) {
        return `${minutes} min ${secs} sec`
    } else {
        return `${secs} sec`
    }
}

/**
 * Formats timestamp for filename (YYYYMMDDHHMMSS)
 * @param {Date} date - The date to format
 * @returns {string} Formatted timestamp string
 */
export function formatTimestamp(date) {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}${month}${day}${hours}${minutes}${seconds}`
}
