import { useEffect, useState } from 'react'
import { Section, Card, Row, LinkButton } from '@shared/ui'
import { useT } from '@shared/i18n'

export function AboutSection(): JSX.Element {
  const [version, setVersion] = useState<string>('')
  const t = useT()

  useEffect(() => {
    window.electron.app.info().then(({ version }) => setVersion(version))
  }, [])

  return (
    <Section title={t.settings.about} subtitle={t.settings.aboutDesc}>
      <div className="grid grid-cols-2 gap-4">

        <Card>
          <Row label="Dodai 3D" description={t.settings.appDesc}>
            <span className="text-xs font-mono text-zinc-400">{version ? `v${version}` : '—'}</span>
          </Row>
          <Row label={t.settings.docs} description={t.settings.docsDesc}>
            <LinkButton label="Open" href="https://dodai3d.app" />
          </Row>
          <Row label={t.settings.github} description={t.settings.githubDesc}>
            <LinkButton label="Open" href="https://github.com/martinleonardcyber-ops/dodai-3d" />
          </Row>
        </Card>

        <Card>
          <Row label={t.settings.discord} description={t.settings.discordDesc}>
            <LinkButton label="Join" href="https://discord.gg/FjzjRgweVk" />
          </Row>
          <Row label={t.settings.licenses} description={t.settings.licensesDesc}>
            <LinkButton label="View" href="https://github.com/martinleonardcyber-ops/dodai-3d/blob/main/LICENSE" />
          </Row>
        </Card>

      </div>
    </Section>
  )
}
