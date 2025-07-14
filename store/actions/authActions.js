export const logoutUser = () => async (dispatch) => {
  try {
    // remove tokens, etc.
    await someApiOrAsyncStorageLogout();
  } catch (error) {
    // handle error
  }
  dispatch({ type: 'LOGOUT_SUCCESS' });
};
