export const lunaModel3 = {
  Version: 3,
  FileReferences: {
    Moc: "luna.moc3",
    Textures: ["textures/luna.png"],
    Physics: "luna.physics3.json",
    Pose: "luna.pose3.json",
    Expressions: [
      { Name: "Smile", File: "expressions/smile.exp3.json" },
      { Name: "Serious", File: "expressions/serious.exp3.json" },
    ],
    Motions: {
      Idle: [
        { File: "motions/idle-0.motion3.json" },
        { File: "motions/idle-1.motion3.json" },
      ],
      Think: [{ File: "motions/think.motion3.json" }],
      Agree: [{ File: "motions/agree.motion3.json" }],
      Happy: [
        { File: "motions/happy-0.motion3.json" },
        { File: "motions/happy-1.motion3.json" },
      ],
    },
  },
  Groups: [
    { Target: "Parameter", Name: "LipSync", Ids: ["ParamMouthOpenY"] },
    { Target: "Parameter", Name: "EyeBlink", Ids: ["ParamEyeLOpen", "ParamEyeROpen"] },
  ],
  Parameters: [
    { Id: "ParamAngleX", Min: -30, Max: 30, Default: 0 },
    { Id: "ParamAngleY", Min: -30, Max: 30, Default: 0 },
    { Id: "ParamEyeBallX", Min: -1, Max: 1, Default: 0 },
    { Id: "ParamEyeBallY", Min: -1, Max: 1, Default: 0 },
    { Id: "ParamMouthOpenY", Min: 0, Max: 1, Default: 0 },
    { Id: "ParamMouthForm", Min: -1, Max: 1, Default: 0 },
    { Id: "ParamEyeLOpen", Min: 0, Max: 1, Default: 1 },
    { Id: "ParamEyeROpen", Min: 0, Max: 1, Default: 1 },
  ],
}

export const lunaFiles: Record<string, string> = {
  "luna.model3.json": JSON.stringify(lunaModel3),
  "luna.moc3": "\u0000moc",
  "textures/luna.png": "\u0000png",
  "luna.physics3.json": JSON.stringify({ Version: 3 }),
  "luna.pose3.json": JSON.stringify({ Type: "Live2D Pose" }),
  "expressions/smile.exp3.json": JSON.stringify({ Version: 3 }),
  "expressions/serious.exp3.json": JSON.stringify({ Version: 3 }),
  "motions/idle-0.motion3.json": JSON.stringify({ Version: 3 }),
  "motions/idle-1.motion3.json": JSON.stringify({ Version: 3 }),
  "motions/think.motion3.json": JSON.stringify({ Version: 3 }),
  "motions/agree.motion3.json": JSON.stringify({ Version: 3 }),
  "motions/happy-0.motion3.json": JSON.stringify({ Version: 3 }),
  "motions/happy-1.motion3.json": JSON.stringify({ Version: 3 }),
}

export function fileSet(files: Record<string, string>) {
  return {
    has: (path: string) => Object.hasOwn(files, path),
    readText: async (path: string) => files[path],
  }
}
