describe('Smoke Test', () => {
  it('build the development version', () => {
    expect(true).to.equal(true)
    cy.visit("http://localhost:3000");
    cy.get('.MuiButtonBase-root');
    cy.get('.css-1io14h-Sample > h3').contains("42")
  })
  it('build the production version', () => {
    expect(true).to.equal(true)
    cy.visit("http://localhost:5000");
    cy.get('.MuiButtonBase-root');
    cy.get('.css-1lrxbo5 > h3').contains("42")
  })
})
