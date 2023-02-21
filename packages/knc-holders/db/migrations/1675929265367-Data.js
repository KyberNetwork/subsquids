module.exports = class Data1675929265367 {
    name = 'Data1675929265367'

    async up(db) {
        await db.query(`CREATE TABLE "knc_holder" ("id" character varying NOT NULL, "amount" numeric NOT NULL, CONSTRAINT "PK_a585c68bd05b0807d0f3a04fa97" PRIMARY KEY ("id"))`)
    }

    async down(db) {
        await db.query(`DROP TABLE "knc_holder"`)
    }
}
