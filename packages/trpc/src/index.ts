export interface ApiHealth {
  status: "ok"
}

export function getApiHealth(): ApiHealth {
  return { status: "ok" }
}
