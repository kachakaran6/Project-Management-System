import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { statusAPI } from "./statusAPI";
import { Status } from "@/types/task.types";

interface StatusState {
  statuses: Status[];
  loading: boolean;
  error: string | null;
}

const initialState: StatusState = {
  statuses: [],
  loading: false,
  error: null,
};

export const fetchStatuses = createAsyncThunk(
  "status/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await statusAPI.fetchStatuses();
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch statuses"
      );
    }
  }
);

const statusSlice = createSlice({
  name: "status",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStatuses.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchStatuses.fulfilled, (state, action) => {
        state.loading = false;
        state.statuses = action.payload;
      })
      .addCase(fetchStatuses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default statusSlice.reducer;
