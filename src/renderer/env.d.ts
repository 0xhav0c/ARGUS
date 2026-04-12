/// <reference types="vite/client" />

declare module '*.css' {
  const content: string
  export default content
}

declare module 'cesium/Build/Cesium/Widgets/widgets.css' {
  const content: string
  export default content
}
