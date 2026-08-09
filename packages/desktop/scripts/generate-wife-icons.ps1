param([string]$Root = (Join-Path $PSScriptRoot "..\icons"))

Add-Type -AssemblyName System.Drawing

function New-WifeBitmap([int]$Size) {
  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $radius = [int]($Size * 0.22)
  $diameter = $radius * 2
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc(0, 0, $diameter, $diameter, 180, 90)
  $path.AddArc($Size - $diameter, 0, $diameter, $diameter, 270, 90)
  $path.AddArc($Size - $diameter, $Size - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc(0, $Size - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()

  $graphics.FillPath([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 32, 33, 36)), $path)
  $inset = [single]($Size * 0.115)
  $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 139, 141, 146), [single]([Math]::Max(1, $Size * 0.024)))
  $graphics.DrawEllipse($pen, $inset, $inset, $Size - 2 * $inset, $Size - 2 * $inset)

  $font = [System.Drawing.Font]::new("Segoe UI", [single]($Size * 0.27), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $graphics.DrawString("OW", $font, [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 242, 242, 240)), [System.Drawing.RectangleF]::new(0, 0, $Size, $Size), $format)

  $format.Dispose()
  $font.Dispose()
  $pen.Dispose()
  $path.Dispose()
  $graphics.Dispose()
  return $bitmap
}

function Save-Png([string]$Path, [int]$Size) {
  $bitmap = New-WifeBitmap $Size
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

function Save-Ico([string]$Path) {
  $sizes = @(16, 24, 32, 48, 64, 128, 256)
  $images = foreach ($size in $sizes) {
    $bitmap = New-WifeBitmap $size
    $stream = [System.IO.MemoryStream]::new()
    $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    ,$stream.ToArray()
    $stream.Dispose()
  }

  $output = [System.IO.File]::Create($Path)
  $writer = [System.IO.BinaryWriter]::new($output)
  $writer.Write([uint16]0)
  $writer.Write([uint16]1)
  $writer.Write([uint16]$sizes.Count)
  $offset = 6 + 16 * $sizes.Count
  for ($index = 0; $index -lt $sizes.Count; $index++) {
    $size = $sizes[$index]
    $writer.Write([byte]($(if ($size -eq 256) { 0 } else { $size })))
    $writer.Write([byte]($(if ($size -eq 256) { 0 } else { $size })))
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([uint16]1)
    $writer.Write([uint16]32)
    $writer.Write([uint32]$images[$index].Length)
    $writer.Write([uint32]$offset)
    $offset += $images[$index].Length
  }
  foreach ($image in $images) { $writer.Write($image) }
  $writer.Dispose()
  $output.Dispose()
}

$outputs = @{
  "icon.png" = 512
  "dock.png" = 256
  "128x128.png" = 128
  "128x128@2x.png" = 256
  "64x64.png" = 64
  "32x32.png" = 32
  "StoreLogo.png" = 50
  "Square30x30Logo.png" = 30
  "Square44x44Logo.png" = 44
  "Square71x71Logo.png" = 71
  "Square89x89Logo.png" = 89
  "Square107x107Logo.png" = 107
  "Square142x142Logo.png" = 142
  "Square150x150Logo.png" = 150
  "Square284x284Logo.png" = 284
  "Square310x310Logo.png" = 310
}

foreach ($channel in @("dev", "beta", "prod")) {
  $directory = Join-Path $Root $channel
  foreach ($output in $outputs.GetEnumerator()) {
    Save-Png (Join-Path $directory $output.Key) $output.Value
  }
  Save-Ico (Join-Path $directory "icon.ico")
}

Write-Output "Generated OpenCode Wife desktop icons in $Root"
