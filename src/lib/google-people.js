/**
 * Google People API — gender + birthday, which the Google Health API does not
 * provide. GET https://people.googleapis.com/v1/people/me with the sensitive
 * scopes `user.birthday.read` and `user.gender.read`.
 *
 * Both fields are frequently empty (users rarely set a birthday/gender), so this
 * always resolves to a shape with null fallbacks rather than throwing.
 */
export async function getPeopleDetails(token) {
  const response = await fetch(
    'https://people.googleapis.com/v1/people/me?personFields=birthdays,genders',
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
  )
  if (!response.ok) return { birthday: null, gender: null }
  const data = await response.json()

  // Google often returns two birthdays: a PROFILE entry without a year and an
  // ACCOUNT entry with the full date. Prefer the one that actually has a year,
  // then any entry with a date. date = { year?, month, day }.
  const birthdays = data.birthdays || []
  const birthdayEntry =
    birthdays.find((entry) => entry.date?.year) || birthdays.find((entry) => entry.date) || birthdays[0]
  const date = birthdayEntry?.date
  const birthday =
    date && date.month && date.day
      ? `${date.year ?? '1900'}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
      : null

  const genderEntry = (data.genders || []).find((entry) => entry.value) || (data.genders || [])[0]
  const gender = genderEntry?.formattedValue ?? genderEntry?.value ?? null

  return { birthday, gender }
}
