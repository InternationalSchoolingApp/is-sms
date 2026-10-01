'use server'
export async function getStatesAndCitites() {
  const response = await fetch(`https://leads.internationalschooling.org/api/v1/common/masters`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requestData: {
        requestKey: "STATES-LIST",
        requestValue: 101,
      },
    }),
  });
  const result = await response.json();
  console.log(result)
  return result.data;
}
