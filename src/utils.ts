export function generateDateList(startDate: string, endDate: string) {
  const dateList = []
  const currentDate = new Date(startDate)

  while (!dateList.includes(endDate)) {
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const day = String(currentDate.getDate()).padStart(2, '0')

    dateList.push(`${year}-${month}-${day}`)

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dateList
}

export function dateToLocaleDate(date: Date) {
  const formattedDate = date
    .toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Europe/Berlin',
    })
    .split('.')
    .reverse()
    .join('-')

  return formattedDate
}
