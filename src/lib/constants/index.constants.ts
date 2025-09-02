export const luaProcessId = "SpJdYt1_CdMG0W5JjDVYfu-tJNGB2bXC6usBSyrQAys"

export const airdropTokenOptions = [
    { value: "YT1", label: "YT1 Token", description: "Yielder Token 1", action: "YT1Airdrop" },
    { value: "YT2", label: "YT2 Token", description: "Yielder Token 2", action: "YT2Airdrop" },
    { value: "YT3", label: "YT3 Token", description: "Yielder Token 3", action: "YT3Airdrop" },
];

/*
"poolProcessId": exchangeRate (tokenB/tokenA)
Exchange rate represents: 1 tokenA = X tokenB
*/

export const poolTokensExchangeRates = {
    "Q9uyLNaNvuFHvNrQQZ_XuOrRZ6OEE0KqSEPJJj8Z4Ys": 1.363636363636, // YT1-YT2: 1.1e14 / 1.5e14
    "76IKbymu5DvaYaZcbMvEJg_WI9LNzZgzv3vcFmgES2M": 0.766666666666, // YT2-YT3: 2.3e14 / 3e14
    "w5UW-qIme4BWojTRQBqFRsweuzWzA-Hy9KExmJM5DMg": 1.4, // YT1-YT3: 2.1e14 / 1.5e14
    "bmR1GHhqKJa9MrQe9g8gC8OrNcitWyFRuVKADIKNXc8": 0.722222222222, // YT3-YT1: 1.3e14 / 1.8e14
    "3TFMtVjYssqCuNPIqcIKn-tM4bWq5KtQ9NKweWxvV1w": 1.153846153846, // YT2-YT1: 2.5961538461539e14 / 2.25e14
    "7YDBq2EZYQk8o_5Lbm6HcxIYqjWcr65ShmKBHH4XqRU": 1.249999999999 // YT3-YT2: 2.2e14 / 1.76e14
}