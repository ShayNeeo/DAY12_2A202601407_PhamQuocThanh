import { onRequestPost as __api_chat_ts_onRequestPost } from "/home/shayneeo/Downloads/Documents/Coding/AI_in_Action/Day_12/Morning/DAY12_2A202601407_PhamQuocThanh/frontend/functions/api/chat.ts"

export const routes = [
    {
      routePath: "/api/chat",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_chat_ts_onRequestPost],
    },
  ]