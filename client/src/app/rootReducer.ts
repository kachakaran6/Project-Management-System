import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/authSlice";
import workspaceReducer from "@/features/workspace/workspaceSlice";
import projectReducer from "@/features/project/projectSlice";
import taskReducer from "@/features/task/taskSlice";
import statusReducer from "@/features/status/statusSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  workspace: workspaceReducer,
  project: projectReducer,
  task: taskReducer,
  status: statusReducer,
});

export default rootReducer;
