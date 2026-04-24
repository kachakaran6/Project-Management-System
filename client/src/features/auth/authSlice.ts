import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { authAPI } from "./authAPI";

interface AuthState {
  user: any | null;
  token: string | null;
  organizations: any[];
  activeOrgId: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem("token"),
  organizations: [],
  activeOrgId: null,
  isAuthenticated: false,
  loading: !!localStorage.getItem("token"),
  error: null,
};

export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials: any, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      return response.data; // Assuming { user, token } or similar
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Login failed");
    }
  }
);

export const fetchMe = createAsyncThunk(
  "auth/fetchMe",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.fetchMe();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch user");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.isAuthenticated = true;
      localStorage.setItem("token", action.payload);
    },
    setActiveOrgId: (state, action: PayloadAction<string>) => {
      state.activeOrgId = action.payload;
      localStorage.setItem("activeOrgId", action.payload);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.organizations = [];
      state.activeOrgId = null;
      state.isAuthenticated = false;
      localStorage.removeItem("token");
      localStorage.removeItem("activeOrgId");
    },
    oauthLogin: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.isAuthenticated = true;
      localStorage.setItem("token", action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        const { user, accessToken, organizations } = action.payload.data;
        state.user = user;
        state.token = accessToken;
        state.organizations = organizations || [];
        const activeOrgId = organizations?.[0]?.id || null;
        state.activeOrgId = activeOrgId;
        state.isAuthenticated = true;
        localStorage.setItem("token", accessToken);
        if (activeOrgId) localStorage.setItem("activeOrgId", activeOrgId);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Me
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        const { user, organizations, organizationId } = action.payload.data;
        state.user = user;
        state.organizations = organizations || [];
        const activeOrgId = state.activeOrgId || organizationId || organizations?.[0]?.id || null;
        state.activeOrgId = activeOrgId;
        state.isAuthenticated = true;
        if (activeOrgId) localStorage.setItem("activeOrgId", activeOrgId);
      })
      .addCase(fetchMe.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.token = null;
        localStorage.removeItem("token");
      });
  },
});

export const { setToken, logout, oauthLogin, setActiveOrgId } = authSlice.actions;
export default authSlice.reducer;
