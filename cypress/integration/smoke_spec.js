describe('Smoke Test', () => {
  it('build the development version', () => {
    expect(true).to.equal(true);
    cy.visit('http://localhost:3000');
    cy.get('#renderCanvas');
  });
  it('build the production version', () => {
    expect(true).to.equal(true);
    cy.visit('http://localhost:5000');
    cy.get('#renderCanvas');
  });
});
