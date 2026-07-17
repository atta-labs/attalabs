import { permanentRedirect } from 'next/navigation'

type Params = { slug: string[] }

export default async function StudioDocsRedirect({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  permanentRedirect(`/docs/${slug.join('/')}`)
}
