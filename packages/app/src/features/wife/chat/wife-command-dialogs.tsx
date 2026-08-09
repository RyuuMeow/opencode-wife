import { ButtonV2 } from "@opencode-ai/ui/v2/button-v2"
import { DialogFooter, DialogHeader, DialogTitleGroup, DialogV2 } from "@opencode-ai/ui/v2/dialog-v2"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { createSignal } from "solid-js"
import { useLanguage } from "@/context/language"
import type { WifeHandoffDraftMode } from "./side-chat-commands"

export function DialogClearWifeChat(props: { onConfirm: () => Promise<boolean> }) {
  const dialog = useDialog()
  const language = useLanguage()
  const [working, setWorking] = createSignal(false)
  const confirm = async () => {
    if (working()) return
    setWorking(true)
    await props.onConfirm()
    dialog.close()
  }
  return (
    <DialogV2 fit>
      <DialogHeader hideClose>
        <DialogTitleGroup
          title={language.t("wife.panel.commands.clear.title")}
          description={language.t("wife.panel.commands.clear.description")}
        />
      </DialogHeader>
      <DialogFooter>
        <ButtonV2 variant="ghost" disabled={working()} onClick={() => dialog.close()}>
          {language.t("common.cancel")}
        </ButtonV2>
        <ButtonV2 variant="danger" disabled={working()} onClick={confirm}>
          {language.t("wife.panel.commands.clear.confirm")}
        </ButtonV2>
      </DialogFooter>
    </DialogV2>
  )
}

export function DialogWifeHandoffDraft(props: { onSelect: (mode: WifeHandoffDraftMode) => void }) {
  const dialog = useDialog()
  const language = useLanguage()
  const select = (mode: WifeHandoffDraftMode) => {
    props.onSelect(mode)
    dialog.close()
  }
  return (
    <DialogV2 fit>
      <DialogHeader hideClose>
        <DialogTitleGroup
          title={language.t("wife.panel.commands.send.draftTitle")}
          description={language.t("wife.panel.commands.send.draftDescription")}
        />
      </DialogHeader>
      <DialogFooter>
        <ButtonV2 variant="ghost" onClick={() => dialog.close()}>
          {language.t("common.cancel")}
        </ButtonV2>
        <ButtonV2 variant="neutral" onClick={() => select("append")}>
          {language.t("wife.panel.commands.send.append")}
        </ButtonV2>
        <ButtonV2 variant="contrast" autofocus onClick={() => select("replace")}>
          {language.t("wife.panel.commands.send.replace")}
        </ButtonV2>
      </DialogFooter>
    </DialogV2>
  )
}
