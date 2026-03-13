package com.daniel.workout.repository;

import com.daniel.workout.model.Exercicio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExercicioRepository extends JpaRepository<Exercicio, Long> {
    // O Spring Data JPA já cria sozinho os métodos: save(), findAll(), findById(), delete()...
}