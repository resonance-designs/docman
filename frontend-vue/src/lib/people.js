export function personName(person) {
  if (!person) {
    return 'Not set';
  }

  if (typeof person === 'string') {
    return person;
  }

  const fullName = [person.firstname, person.lastname].filter(Boolean).join(' ');
  return fullName || person.username || person.email || 'Not set';
}
