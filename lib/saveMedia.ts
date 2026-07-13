/**
 * Saves a photo/video to the user's device.
 *
 * On mobile (especially an installed PWA), <a download> on a blob:/data: URL is
 * unreliable — iOS Safari and Chrome largely ignore it in standalone display
 * mode. navigator.share() with the actual file is the OS-native, reliable path
 * there (it surfaces "Save Image"/"Save Video" in the share sheet). Desktop
 * browsers without file-share support fall back to the classic anchor click.
 */
export async function saveMedia(
  source: string | Blob,
  filename: string,
  mimeType: string,
  onResult: (message: string | null) => void
) {
  try {
    const blob = typeof source === 'string' ? await (await fetch(source)).blob() : source
    const file = new File([blob], filename, { type: mimeType })

    const canShareFile =
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] }))

    if (canShareFile) {
      try {
        await navigator.share({ files: [file] })
        onResult('Saved')
        return
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') { onResult(null); return }
        // fall through to the anchor-download fallback below
      }
    }

    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    onResult('Saved')
  } catch {
    onResult('Could not save — try again')
  }
}
