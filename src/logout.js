document.getElementById('logoutButton').addEventListener('click', async () => {
    try {
        // Clear local storage where JWT is stored
        localStorage.removeItem('jwtToken');

        // Optionally, clear cookies if needed
        document.cookie = 'jwtToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT';

        console.log('Logged out successfully');
    } catch (error) {
        console.error(error);
    }
});