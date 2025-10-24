#!/bin/bash
cd "$(dirname "$0")/../backend/CrescerSaudavel.Api"
dotnet ef database update || dotnet ef migrations add InitialCreate && dotnet ef database update
dotnet run
