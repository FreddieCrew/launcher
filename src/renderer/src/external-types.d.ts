declare module 'node-7z' {
  interface ExtractOptions {
    $bin?: string
    $progress?: boolean
    recursive?: boolean
    wildcards?: string[]
    [key: string]: any
  }

  export function extractFull(archive: string, dest: string, options?: ExtractOptions): any
}

declare module '7zip-bin' {
  const path7za: string
  const path7x: string
  const path7z: string
  const path: string
  const path7za_64: string

  const content: {
    path7za: string
    path7x: string
    path7z: string
    path: string
  }

  export default content
}
