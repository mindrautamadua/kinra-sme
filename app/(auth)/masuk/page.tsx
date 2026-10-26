import { FormMasuk } from './FormMasuk'

export default async function Masuk({ searchParams }: { searchParams: Promise<{ lanjut?: string }> }) {
  const { lanjut } = await searchParams
  return <FormMasuk lanjut={lanjut ?? '/'} />
}
