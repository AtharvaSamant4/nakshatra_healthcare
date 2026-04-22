console.log(JSON.stringify({id: "p1000001-0001-4000-8000-000000000001"}).replace(/\b[A-Za-z]([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\b/g, "$1"))
